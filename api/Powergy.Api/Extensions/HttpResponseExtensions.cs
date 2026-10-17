namespace Powergy.Api.Extensions;

public static class HttpResponseExtensions
{
    /// <summary>
    /// Marca las respuestas públicas del catálogo como cacheables un minuto por
    /// intermediarios. Los endpoints administrativos nunca usan esta cabecera.
    /// </summary>
    public static void SetPublicCatalogCache(this HttpResponse response) =>
        response.Headers.CacheControl = "public, max-age=60, stale-while-revalidate=300";
}
