using LadiPage.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Templates;

public class GetTemplateByIdQueryHandler : IRequestHandler<GetTemplateByIdQuery, TemplateDetailDto?>
{
    private readonly IAppDbContext _db;

    public GetTemplateByIdQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<TemplateDetailDto?> Handle(GetTemplateByIdQuery request, CancellationToken cancellationToken)
    {
        return await _db.Templates.AsNoTracking()
            .Where(t => t.Id == request.Id)
            .Select(t => new TemplateDetailDto(t.Id, t.Name, t.Category, t.ThumbnailUrl, t.JsonContent, t.CreatedAt))
            .FirstOrDefaultAsync(cancellationToken);
    }
}

