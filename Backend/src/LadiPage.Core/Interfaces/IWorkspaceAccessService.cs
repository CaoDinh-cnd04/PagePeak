namespace LadiPage.Core.Interfaces;

/// <summary>
/// Service to verify user has access to a workspace (owner or member).
/// Used to prevent IDOR when accessing resources by workspace/page/entity ID.
/// </summary>
public interface IWorkspaceAccessService
{
    Task<bool> CanAccessWorkspaceAsync(long userId, long workspaceId, CancellationToken cancellationToken = default);
}
