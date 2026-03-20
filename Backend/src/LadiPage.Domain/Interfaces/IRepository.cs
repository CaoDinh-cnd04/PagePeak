using LadiPage.Domain.Common;

namespace LadiPage.Domain.Interfaces;

/// <summary>
/// Generic repository interface for read operations.
/// Implementation resides in Infrastructure layer.
/// </summary>
public interface IReadRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default);
}
