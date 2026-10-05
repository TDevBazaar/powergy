using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Powergy.Api.Auth;
using Powergy.Api.Data;
using Powergy.Api.Middleware;
using Powergy.Api.Services;

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

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();

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
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();

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
        ? Results.Ok(new { status = "ok", database = "connected" })
        : Results.Problem("No se pudo conectar con PostgreSQL.", statusCode: 503);
});

app.Run();
