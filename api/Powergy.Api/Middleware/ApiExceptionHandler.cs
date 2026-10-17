using System.Diagnostics;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Powergy.Api.Exceptions;

namespace Powergy.Api.Middleware;

public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (status, title, detail) = exception switch
        {
            ApiNotFoundException => (
                StatusCodes.Status404NotFound,
                "Resource not found",
                exception.Message),
            ApiConflictException => (
                StatusCodes.Status409Conflict,
                "Conflict",
                exception.Message),
            ApiValidationException => (
                StatusCodes.Status400BadRequest,
                "Invalid request",
                exception.Message),
            _ => (0, string.Empty, string.Empty)
        };

        if (status == 0)
        {
            logger.LogError(exception, "Unhandled API exception.");
            return false;
        }

        var traceId = Activity.Current?.Id ?? httpContext.TraceIdentifier;
        logger.LogWarning(
            exception,
            "Request failed with HTTP {StatusCode} (traceId {TraceId}).",
            status,
            traceId);

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Instance = httpContext.Request.Path,
            Extensions = { ["traceId"] = traceId }
        }, cancellationToken);

        return true;
    }
}
