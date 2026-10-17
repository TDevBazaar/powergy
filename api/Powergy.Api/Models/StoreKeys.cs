using Powergy.Api.Exceptions;

namespace Powergy.Api.Models;

/// <summary>
/// Claves de tienda: varias tiendas comparten la misma base de datos y cada una
/// ve únicamente sus productos, categorías y solicitudes. Cuando una petición no
/// indica tienda se asume el catálogo original de energía solar.
/// </summary>
public static class StoreKeys
{
    /// <summary>Tienda del catálogo original de energía solar.</summary>
    public const string Powergy = "powergy";

    /// <summary>Tienda aplicada cuando la petición no indica ninguna.</summary>
    public const string Default = Powergy;

    /// <summary>
    /// Normaliza la clave recibida (minúsculas, sin espacios) y devuelve
    /// <see cref="Default"/> cuando viene vacía. Lanza una validación cuando el
    /// formato no es válido.
    /// </summary>
    public static string Resolve(string? store)
    {
        var value = store?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(value))
        {
            return Default;
        }

        var valido = value.Length is >= 2 and <= 40
            && char.IsAsciiLetterOrDigit(value[0])
            && value.All(caracter =>
                char.IsAsciiLetterOrDigit(caracter) || caracter is '-' or '_');
        if (!valido)
        {
            throw new ApiValidationException(
                "La tienda indicada no es válida: usa de 2 a 40 caracteres entre "
                + "letras, números, guiones o guion bajo, empezando por letra o número.");
        }

        return value;
    }
}
