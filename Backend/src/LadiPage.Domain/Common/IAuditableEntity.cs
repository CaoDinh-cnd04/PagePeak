namespace LadiPage.Domain.Common;

/// <summary>
/// Marks entities that support audit tracking (CreatedAt, UpdatedAt).
/// </summary>
public interface IAuditableEntity
{
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }
}
