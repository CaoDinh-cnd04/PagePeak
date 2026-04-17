using LadiPage.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/vn-address")]
public class VnAddressController(AppDbContext db) : ControllerBase
{
    /// <summary>Lấy danh sách tỉnh/thành phố</summary>
    [HttpGet("provinces")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProvinces()
    {
        var provinces = await db.Provinces
            .OrderBy(x => x.Order)
            .Select(x => new { x.Id, x.Name })
            .ToListAsync();

        return Ok(provinces);
    }

    /// <summary>Lấy danh sách quận/huyện theo tỉnh</summary>
    [HttpGet("provinces/{provinceId:int}/districts")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDistricts(int provinceId)
    {
        var districts = await db.Districts
            .Where(x => x.ProvinceId == provinceId)
            .OrderBy(x => x.Order)
            .Select(x => new { x.Id, x.Name })
            .ToListAsync();

        return Ok(districts);
    }

    /// <summary>Lấy danh sách phường/xã theo quận/huyện</summary>
    [HttpGet("districts/{districtId:int}/wards")]
    [AllowAnonymous]
    public async Task<IActionResult> GetWards(int districtId)
    {
        var wards = await db.Wards
            .Where(x => x.DistrictId == districtId)
            .OrderBy(x => x.Order)
            .Select(x => new { x.Id, x.Name })
            .ToListAsync();

        return Ok(wards);
    }

    /// <summary>Lấy toàn bộ dữ liệu địa giới (dùng cho cache client-side)</summary>
    [HttpGet("all")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var provinces = await db.Provinces
            .OrderBy(x => x.Order)
            .Select(x => new
            {
                x.Id,
                x.Name,
                Districts = x.Districts
                    .OrderBy(d => d.Order)
                    .Select(d => new
                    {
                        d.Id,
                        d.Name,
                        Wards = d.Wards
                            .OrderBy(w => w.Order)
                            .Select(w => new { w.Id, w.Name })
                            .ToList()
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(provinces);
    }
}
