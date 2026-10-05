using System.Linq.Expressions;

namespace Powergy.Api.Specifications;

public abstract class Specification<TEntity> : ISpecification<TEntity>
    where TEntity : class
{
    private readonly List<Expression<Func<TEntity, object>>> _includes = [];

    public Expression<Func<TEntity, bool>>? Criteria { get; protected init; }
    public IReadOnlyList<Expression<Func<TEntity, object>>> Includes => _includes;

    protected void AddInclude(Expression<Func<TEntity, object>> include)
        => _includes.Add(include);
}
