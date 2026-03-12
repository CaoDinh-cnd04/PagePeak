using LadiPage.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Pages;

public class GetPagesQueryHandler : IRequestHandler<GetPagesQuery, IReadOnlyList<PageDto>>
{
    private readonly IAppDbContext _db;

    public GetPagesQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<PageDto>> Handle(GetPagesQuery request, CancellationToken cancellationToken)
    {
        return await _db.Pages.AsNoTracking()
            .Where(p => p.WorkspaceId == request.WorkspaceId)
            .OrderByDescending(p => p.UpdatedAt)
            .Select(p => new PageDto(p.Id, p.WorkspaceId, p.Name, p.Slug, p.Status, p.UpdatedAt))
            .ToListAsync(cancellationToken);
    }
}

