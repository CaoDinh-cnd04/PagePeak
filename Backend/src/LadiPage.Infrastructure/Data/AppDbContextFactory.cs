using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace LadiPage.Infrastructure.Data;

/// <summary>
/// Cho phép <c>dotnet ef migrations add|update|remove</c> từ CLI mà không cần chạy API.
/// Thứ tự: biến môi trường <c>ConnectionStrings__DefaultConnection</c> → appsettings của <c>LadiPage.Api</c> → chuỗi mặc định localhost.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var fromEnv = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        if (!string.IsNullOrWhiteSpace(fromEnv))
            return Create(fromEnv);

        var apiRoot = FindApiProjectDirectory();
        if (apiRoot != null)
        {
            var cfg = new ConfigurationBuilder()
                .SetBasePath(apiRoot)
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
                .AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: false)
                .AddEnvironmentVariables()
                .Build();
            var cs = cfg.GetConnectionString("DefaultConnection");
            if (!string.IsNullOrWhiteSpace(cs))
                return Create(cs);
        }

        return Create(
            "Server=localhost;Database=LadiPageDB;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true");
    }

    private static AppDbContext Create(string connectionString)
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>();
        opts.UseSqlServer(connectionString);
        return new AppDbContext(opts.Options);
    }

    /// <summary>Tìm thư mục chứa appsettings.json của API khi chạy ef từ bất kỳ thư mục nào trong repo.</summary>
    private static string? FindApiProjectDirectory()
    {
        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        for (var depth = 0; depth < 12 && dir != null; depth++)
        {
            var a = Path.Combine(dir.FullName, "src", "LadiPage.Api", "appsettings.json");
            if (File.Exists(a))
                return Path.GetDirectoryName(a)!;
            var b = Path.Combine(dir.FullName, "LadiPage.Api", "appsettings.json");
            if (File.Exists(b))
                return Path.GetDirectoryName(b)!;
            dir = dir.Parent;
        }

        return null;
    }
}
