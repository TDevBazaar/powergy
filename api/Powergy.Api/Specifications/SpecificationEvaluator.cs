using Microsoft.EntityFrameworkCore;

namespace Powergy.Api.Specifications;

public static class SpecificationEvaluator
{
    public static IQueryable<TEntity> GetQuery<TEntity>(
        IQueryable<TEntity> inputQuery,
        ISpecification<TEntity> specification)
        where TEntity : class
    {
        var query = inputQuery;

        if (specification.Criteria is not null)
        {
            query = query.Where(specification.Criteria);
        }

        return specification.Includes.Aggregate(
            query,
            (current, include) => current.Include(include));
    }
}
