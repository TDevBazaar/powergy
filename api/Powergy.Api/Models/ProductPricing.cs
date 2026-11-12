using Powergy.Api.Exceptions;

namespace Powergy.Api.Models;

/// <summary>Cálculo y validación coherente de descuentos porcentuales en el catálogo.</summary>
public static class ProductPricing
{
    public static int? NormalizeDiscountPercent(
        bool onSale,
        decimal? priceUsd,
        int? discountPercent)
    {
        if (!onSale || discountPercent is null or 0)
        {
            return null;
        }

        if (discountPercent is < 1 or > 99)
        {
            throw new ApiValidationException("El porcentaje de rebaja debe estar entre 1 y 99.");
        }

        if (priceUsd is null or <= 0m)
        {
            throw new ApiValidationException(
                "Para aplicar un porcentaje de rebaja debes definir un precio original mayor que 0.");
        }

        return discountPercent;
    }

    public static int? GetActiveDiscountPercent(Product product) =>
        product.OnSale
        && product.PriceUsd is > 0m
        && product.DiscountPercent is > 0 and <= 99
            ? product.DiscountPercent
            : null;

    public static decimal? GetEffectivePriceUsd(Product product) =>
        ComputeEffectivePriceUsd(product.PriceUsd, product.OnSale, product.DiscountPercent);

    public static decimal? ComputeEffectivePriceUsd(
        decimal? priceUsd,
        bool onSale,
        int? discountPercent)
    {
        if (priceUsd is null or <= 0m)
        {
            return priceUsd;
        }

        if (!onSale || discountPercent is null or <= 0)
        {
            return priceUsd.Value;
        }

        var pct = Math.Clamp(discountPercent.Value, 1, 99);
        var discounted = Math.Round(
            priceUsd.Value * (100m - pct) / 100m,
            2,
            MidpointRounding.AwayFromZero);

        return discounted < 0.01m ? 0.01m : discounted;
    }
}

