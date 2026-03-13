using LadiPage.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Templates;

public class GetTemplatesQueryHandler : IRequestHandler<GetTemplatesQuery, IReadOnlyList<TemplateDto>>
{
    private readonly IAppDbContext _db;

    public GetTemplatesQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<TemplateDto>> Handle(GetTemplatesQuery request, CancellationToken cancellationToken)
    {
        var q = _db.Templates.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            var c = request.Category.Trim();
            q = q.Where(t => t.Category == c);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            q = q.Where(t => t.Name.ToLower().Contains(s) || (t.Description != null && t.Description.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(request.DesignType))
        {
            q = q.Where(t => t.DesignType == request.DesignType);
        }

        if (request.FeaturedOnly == true)
        {
            q = q.Where(t => t.IsFeatured);
        }

        return await q
            .OrderByDescending(t => t.UsageCount)
            .ThenByDescending(t => t.CreatedAt)
            .Select(t => new TemplateDto(t.Id, t.Name, t.Category, t.ThumbnailUrl, t.Description, t.DesignType, t.IsFeatured, t.UsageCount, t.CreatedAt))
            .ToListAsync(cancellationToken);
    }
}
