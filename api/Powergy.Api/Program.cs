using System.IO.Compression;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.Server.IIS;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Powergy.Api.Auth;
using Powergy.Api.Data;
using Powergy.Api.Middleware;
using Powergy.Api.Services;
using Serilog;
using Serilog.Events;

// Los payloads reales de la API son de pocos kilobytes; 256 KB evita abusos de memoria.
const long MaxRequestBodyBytes = 256 * 1024;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Supabase");
var supabaseUrl = builder.Configuration["Supabase:Url"]?.TrimEnd('/');
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

if (builder.Environment.IsProduction())
{
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException(
            "Falta configurar ConnectionStrings:Supabase en producción.");
    }

    NpgsqlConnectionStringBuilder postgresSettings;
    try
    {
        postgresSettings = new NpgsqlConnectionStringBuilder(connectionString);
    }
    catch (ArgumentException exception)
    {
        throw new InvalidOperationException(
            "ConnectionStrings:Supabase no contiene una cadena PostgreSQL válida.",
            exception);
    }

    if (string.IsNullOrWhiteSpace(postgresSettings.Host)
        || string.IsNullOrWhiteSpace(postgresSettings.Username)
        || string.IsNullOrWhiteSpace(postgresSettings.Password)
        || postgresSettings.SslMode != SslMode.Require)
    {
        throw new InvalidOperationException(
            "ConnectionStrings:Supabase debe incluir Host, Username, Password y SSL Mode=Require.");
    }

    if (!Uri.TryCreate(supabaseUrl, UriKind.Absolute, out var supabaseUri)
        || supabaseUri.Scheme != Uri.UriSchemeHttps)
    {
        throw new InvalidOperationException(
            "Supabase:Url debe ser una URL HTTPS válida en producción.");
    }

    if (allowedOrigins.Length == 0 || allowedOrigins.Any(origin =>
            !Uri.TryCreate(origin, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || uri.GetLeftPart(UriPartial.Authority) != origin.TrimEnd('/')))
    {
        throw new InvalidOperationException(
            "Configure Cors:AllowedOrigins con los orígenes HTTPS exactos del frontend en producción.");
    }
}

// Trazas estructuradas en consola y en archivos rotativos dentro de la aplicación.
builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Services(services)
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(
        Path.Combine(AppContext.BaseDirectory, "logs", "powergy-.log"),
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 7,
        fileSizeLimitBytes: 10 * 1024 * 1024,
        rollOnFileSizeLimit: true,
        outputTemplate:
            "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}"));

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = MaxRequestBodyBytes;
});

builder.Services.Configure<IISServerOptions>(options =>
{
    options.MaxRequestBodySize = MaxRequestBodyBytes;
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddHttpContextAccessor();

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(
        ["application/json", "application/problem+json"]);
});
builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});

var audience = builder.Configuration["Supabase:Audience"] ?? "authenticated";

builder.Services.AddDbContext<PowergyDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        if (!string.IsNullOrWhiteSpace(supabaseUrl))
        {
            options.Authority = $"{supabaseUrl}/auth/v1";
            options.MetadataAddress = $"{supabaseUrl}/auth/v1/.well-known/openid-configuration";
        }

        options.Audience = audience;
        options.RequireHttpsMetadata = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"{supabaseUrl}/auth/v1",
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(60)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireAuthenticatedUser()
            .AddRequirements(new AdminRequirement()));
});
builder.Services.AddScoped<IAuthorizationHandler, AdminAuthorizationHandler>();
builder.Services.AddScoped<ICurrentAdminAccessor, CurrentAdminAccessor>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<ICustomerOrderService, CustomerOrderService>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseResponseCompression();
app.UseSerilogRequestLogging(options =>
{
    options.GetLevel = (httpContext, _, _) =>
        httpContext.Request.Path.StartsWithSegments("/health")
            ? LogEventLevel.Verbose
            : LogEventLevel.Information;
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", async (PowergyDbContext db, CancellationToken cancellationToken) =>
{
    var connected = await db.Database.CanConnectAsync(cancellationToken);
    return connected
        ? Results.Ok(new
        {
            status = "ok",
            database = "connected",
            version = typeof(Program).Assembly.GetName().Version?.ToString() ?? "unknown"
        })
        : Results.Problem("No se pudo conectar con PostgreSQL.", statusCode: 503);
});

app.Run();
