using LadiPage.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Pages;

public class GetPagesQueryHandler : IRequestHandler<GetPagesQuery, IReadOnlyList<PageDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IWorkspaceAccessService _workspaceAccess;

    public GetPagesQueryHandler(IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess)
    {
        _db = db;
        _currentUser = currentUser;
        _workspaceAccess = workspaceAccess;
    }

    public async Task<IReadOnlyList<PageDto>> Handle(GetPagesQuery request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId == null) return Array.Empty<PageDto>();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, request.WorkspaceId, cancellationToken))
            return Array.Empty<PageDto>();

        return await _db.Pages.AsNoTracking()
            .Where(p => p.WorkspaceId == request.WorkspaceId)
            .OrderByDescending(p => p.UpdatedAt)
            .Select(p => new PageDto(p.Id, p.WorkspaceId, p.Name, p.Slug, p.Status, p.UpdatedAt))
            .ToListAsync(cancellationToken);
    }
}

