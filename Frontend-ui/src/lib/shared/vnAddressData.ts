/** Dữ liệu địa giới tối giản cho cascade Tỉnh → Quận/Huyện → Phường/Xã (mở rộng dần). */

export const DEFAULT_COUNTRY = "Việt Nam";

export type DistrictNode = { name: string; wards: string[] };
export type ProvinceNode = { name: string; districts: DistrictNode[] };

export const PROVINCES: ProvinceNode[] = [
  {
    name: "Hà Nội",
    districts: [
      {
        name: "Quận Bắc Từ Liêm",
        wards: ["Phường Thượng Cát", "Phường Liên Mạc", "Phường Đông Ngạc"],
      },
      {
        name: "Quận Ba Đình",
        wards: ["Phường Điện Biên", "Phường Trúc Bạch", "Phường Phúc Xá"],
      },
    ],
  },
  {
    name: "TP. Hồ Chí Minh",
    districts: [
      {
        name: "Quận 1",
        wards: ["Phường Bến Nghé", "Phường Đa Kao", "Phường Tân Định"],
      },
      {
        name: "Quận 7",
        wards: ["Phường Tân Hưng", "Phường Tân Phú", "Phường Phú Mỹ"],
      },
    ],
  },
];

export function findProvince(name: string | null | undefined): ProvinceNode | undefined {
  if (!name?.trim()) return undefined;
  return PROVINCES.find((p) => p.name === name);
}

export function findDistrict(provinceName: string | null | undefined, districtName: string | null | undefined): DistrictNode | undefined {
  const p = findProvince(provinceName);
  if (!p || !districtName?.trim()) return undefined;
  return p.districts.find((d) => d.name === districtName);
}
