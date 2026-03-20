using LadiPage.Domain.Interfaces;

namespace LadiPage.Infrastructure.Services;

public class DateTimeService : IDateTime
{
    public DateTime UtcNow => DateTime.UtcNow;
}
