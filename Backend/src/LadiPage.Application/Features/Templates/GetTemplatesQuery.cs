using MediatR;

namespace LadiPage.Application.Features.Templates;

public record GetTemplatesQuery(string? Category = null) : IRequest<IReadOnlyList<TemplateDto>>;

