using LadiPage.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Auth;

public class GetProfileQueryHandler : IRequestHandler<GetProfileQuery, UserProfileDto?>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public GetProfileQueryHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<UserProfileDto?> Handle(GetProfileQuery request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId == null)
            return null;
        var user = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == _currentUser.UserId)
            .Select(u => new UserProfileDto(
                u.Id,
                u.Email,
                u.FullName,
                u.Phone,
                u.AvatarUrl,
                u.Role,
                u.CurrentPlanId,
                u.PlanExpiresAt
            ))
            .FirstOrDefaultAsync(cancellationToken);
        return user;
    }
}
