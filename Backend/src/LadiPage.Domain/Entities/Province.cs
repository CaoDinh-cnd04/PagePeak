namespace LadiPage.Domain.Entities;

/// <summary>Tỉnh/Thành phố — dữ liệu địa giới hành chính Việt Nam</summary>
public class Province
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int Order { get; set; }
    public ICollection<District> Districts { get; set; } = new List<District>();
}

/// <summary>Quận/Huyện</summary>
public class District
{
    public int Id { get; set; }
    public int ProvinceId { get; set; }
    public string Name { get; set; } = "";
    public int Order { get; set; }
    public Province Province { get; set; } = null!;
    public ICollection<Ward> Wards { get; set; } = new List<Ward>();
}

/// <summary>Phường/Xã/Thị trấn</summary>
public class Ward
{
    public int Id { get; set; }
    public int DistrictId { get; set; }
    public string Name { get; set; } = "";
    public int Order { get; set; }
    public District District { get; set; } = null!;
}
