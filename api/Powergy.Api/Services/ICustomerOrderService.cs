using Powergy.Api.Contracts;

namespace Powergy.Api.Services;

public interface ICustomerOrderService
{
    Task<CustomerOrderResponse> CreateAsync(
        CreateCustomerOrderRequest request,
        CancellationToken cancellationToken);

    Task<PagedResponse<CustomerOrderListItemResponse>> GetPageAsync(
        CustomerOrderQueryRequest request,
        CancellationToken cancellationToken);

    Task<CustomerOrderResponse?> GetByIdAsync(
        Guid id,
        string? store,
        CancellationToken cancellationToken);

    Task<CustomerOrderResponse> CloseAsync(
        Guid id,
        string? store,
        Guid adminUserId,
        CloseCustomerOrderRequest request,
        CancellationToken cancellationToken);

    Task<CustomerOrderMetricsResponse> GetMetricsAsync(
        CustomerOrderMetricsRequest request,
        CancellationToken cancellationToken);
}
