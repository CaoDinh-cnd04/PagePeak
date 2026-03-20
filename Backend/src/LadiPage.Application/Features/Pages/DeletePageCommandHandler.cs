using LadiPage.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Pages;

public class DeletePageCommandHandler : IRequestHandler<DeletePageCommand, bool>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public DeletePageCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<bool> Handle(DeletePageCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId == null) return false;
        var userId = _currentUser.UserId.Value;

        var page = await _db.Pages
            .FirstOrDefaultAsync(p => p.Id == request.PageId, cancellationToken);
        if (page == null) return false;

        var canAccess = await _db.Workspaces
            .AsNoTracking()
            .AnyAsync(w => w.Id == page.WorkspaceId &&
                (w.OwnerId == userId || _db.WorkspaceMembers.Any(m => m.WorkspaceId == w.Id && m.UserId == userId)), cancellationToken);
        if (!canAccess) return false;

        _db.Pages.Remove(page);
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
