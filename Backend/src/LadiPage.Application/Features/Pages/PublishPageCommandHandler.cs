using LadiPage.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Pages;

public class PublishPageCommandHandler : IRequestHandler<PublishPageCommand, bool>
{
    private readonly IAppDbContext _db;

    public PublishPageCommandHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> Handle(PublishPageCommand request, CancellationToken cancellationToken)
    {
        var page = await _db.Pages.FirstOrDefaultAsync(p => p.Id == request.PageId, cancellationToken);
        if (page == null) return false;
        page.Status = "published";
        page.PublishedAt = DateTime.UtcNow;
        page.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }
}

