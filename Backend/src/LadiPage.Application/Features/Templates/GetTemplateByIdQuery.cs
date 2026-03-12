using MediatR;

namespace LadiPage.Application.Features.Templates;

public record GetTemplateByIdQuery(long Id) : IRequest<TemplateDetailDto?>;

