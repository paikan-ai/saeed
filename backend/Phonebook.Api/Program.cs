using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Phonebook.Api.Data;
using Phonebook.Api.Infrastructure;
using Phonebook.Api.Mapping;
using Phonebook.Api.Models;
using Phonebook.Api.Services;

// ============================================================
//  نقطه‌ی شروع API — دفترچه تلفن چندکاربره
//  معماری لایه‌ای: Controllers → Services → EF Core (SQL Server)
// ============================================================

var builder = WebApplication.CreateBuilder(args);

// ---------- لایه‌ی داده: EF Core + SQL Server (Code-First) ----------
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ---------- AutoMapper: نگاشت Entity ↔ DTO ----------
var mapperConfig = new AutoMapper.MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>());
mapperConfig.AssertConfigurationIsValid();
builder.Services.AddSingleton(mapperConfig.CreateMapper());

// ---------- FluentValidation: ثبت خودکار همه‌ی Validatorها ----------
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// ---------- سرویس‌های تجاری ----------
builder.Services.AddScoped<PasswordHasher>();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<ContactService>();

// ---------- احراز هویت با JWT ----------
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key تنظیم نشده است");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        // بازگرداندن پیام فارسی برای درخواست‌های بدون توکن/توکن نامعتبر
        options.Events = new JwtBearerEvents
        {
            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";
                return context.Response.WriteAsJsonAsync(new ApiErrorResponse("ابتدا وارد حساب کاربری خود شوید."));
            },
            OnForbidden = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                return context.Response.WriteAsJsonAsync(new ApiErrorResponse("شما دسترسی لازم برای این عملیات را ندارید."));
            }
        };
    });

// ---------- تعریف Policyهای سطوح دسترسی (RBAC) ----------
// این Policyها در Middleware احراز هویت، Claimهای داخل توکن را چک می‌کنند.
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(Pol.ContactCreate, p => p.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(Perm.Create)));
    options.AddPolicy(Pol.ContactEdit,   p => p.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(Perm.Edit)));
    options.AddPolicy(Pol.ContactDelete, p => p.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(Perm.Delete)));
});
builder.Services.AddSingleton<IAuthorizationHandler, PermissionHandler>();

// ---------- کنترلرها + فیلتر اعتبارسنجی سراسری ----------
builder.Services.AddControllers(options =>
        options.Filters.Add<FluentValidationFilter>())
    // سریال‌سازی Enumها به‌صورت رشته (Admin/User, Mobile/Home/Work) برای سهولت فرانت‌اند
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

// ---------- CORS برای فرانت‌اند React ----------
// فرانت‌اند از آدرس http://localhost:5000 (تعریف‌شده در BASE_URL فایل src/lib/api.ts)
// به این API وصل می‌شود؛ چون Origin فرانت متفاوت است (پورت 3000 یا هاست دیگر)،
// در حالت توسعه اجازه‌ی همه‌ی Originها داده می‌شود.
// ⚠️ در Production حتماً با WithOrigins فقط آدرس‌های مجاز را قبول کنید.
builder.Services.AddCors(options => options.AddPolicy("ReactDev", policy =>
    policy.AllowAnyOrigin()
          .AllowAnyHeader()
          .AllowAnyMethod()));

// ---------- Swagger با پشتیبانی از توکن Bearer ----------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Phonebook API", Version = "v1", Description = "API دفترچه تلفن چندکاربره" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "توکن JWT دریافتی از api/auth/login را اینجا وارد کنید"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme
        {
            Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
        }] = Array.Empty<string>()
    });
});

var app = builder.Build();

// ---------- آماده‌سازی دیتابیس + Seed اولیه ----------
// نکته: برای محیط Production بهتر است از Migration استفاده کنید:
//   dotnet ef migrations add Init && dotnet ef database update
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
    await AppDbContext.SeedAsync(db);
}

// ---------- Middlewareها ----------
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors("ReactDev");

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();   // ابتدا احراز هویت (JWT)
app.UseAuthorization();    // سپس بررسی مجوزها (Policyهای RBAC)

// مسیر سلامتی — فرانت‌اند از این مسیر برای تشخیص اتصال به سرور واقعی استفاده می‌کند
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));

app.MapControllers();

app.Run();

// کلاس Program برای استفاده در AddValidatorsFromAssemblyContaining<Program>
public partial class Program;
