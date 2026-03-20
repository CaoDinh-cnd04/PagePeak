namespace LadiPage.Domain.Common;

/// <summary>
/// Base class for all domain entities. Provides common identity.
/// </summary>
public abstract class BaseEntity
{
    public long Id { get; set; }
}
