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
            q = q.Where(t => t.Category.Contains(c));
        }

        return await q
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new TemplateDto(t.Id, t.Name, t.Category, t.ThumbnailUrl, t.CreatedAt))
            .ToListAsync(cancellationToken);
    }
}

