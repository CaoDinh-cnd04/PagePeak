import {
  GripVertical, ArrowUpToLine, ArrowDownToLine, Copy, Trash2,
  ImagePlus, Settings, HelpCircle, MoreHorizontal,
  Lock, Unlock, EyeOff, Eye, Smile, Code2,
  Bold, AlignLeft, AlignCenter, AlignRight,
} from "lucide-react";

export type TextFormatToolbarState = {
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: number;
  textAlign: "left" | "center" | "right" | "justify";
  onFontSizeChange: (n: number) => void;
  onFontFamilyChange: (font: string) => void;
  onColorChange: (hex: string) => void;
  onBoldToggle: () => void;
  onAlignChange: (align: "left" | "center" | "right") => void;
};

interface ElementActionToolbarProps {
  elementType: string;
  isLocked: boolean;
  isHidden: boolean;
  /** Hiển thị cỡ chữ / font / màu / đậm / căn khi đang chọn Textbox (headline, paragraph, …). */
  textFormat?: TextFormatToolbarState | null;
  /** Danh sách font cho dropdown (Google Fonts family name). */
  fontOptions?: string[];
  onDuplicate: () => void;
  onDelete: () => void;
  onAddImage: () => void;
  onRequestChangeIcon?: () => void;
  onAddFormField?: () => void;
  onSaveFormData?: () => void;
  onRotateVertical?: () => void;
  onColorChange?: (color: string) => void;
  lineThickness?: number;
  lineColor?: string;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onToggleLock: () => void;
  onToggleHide: () => void;
  onOpenSettings?: () => void;
  onEditHtmlCode?: () => void;
  showMoreMenu: boolean;
  onToggleMore: () => void;
}

export function ElementActionToolbar({
  elementType,
  isLocked,
  isHidden,
  textFormat,
  fontOptions = [],
  onDuplicate,
  onDelete,
  onAddImage,
  onRequestChangeIcon,
  onAddFormField,
  onSaveFormData,
  onRotateVertical,
  onColorChange,
  lineThickness,
  lineColor,
  onBringToFront,
  onSendToBack,
  onToggleLock,
  onToggleHide,
  onOpenSettings,
  onEditHtmlCode,
  showMoreMenu,
  onToggleMore,
}: ElementActionToolbarProps) {
  const showAddImage =
    elementType === "gallery" ||
    elementType === "image" ||
    elementType === "shape" ||
    elementType === "product-detail" ||
    elementType === "collection-list" ||
    elementType === "blog-list" ||
    elementType === "tabs" ||
    elementType === "carousel";
  const showEditHtml = elementType === "html-code";
  const showChangeIcon = elementType === "icon";
  const showFormControls = elementType === "form";
  const showLineControls = elementType === "divider";

  return (
    <div className="flex items-center gap-0.5 bg-white rounded-lg shadow-lg border border-slate-200 py-1 px-1.5">
      <button type="button" className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Di chuyển">
        <GripVertical className="w-4 h-4" />
      </button>
      <button type="button" onClick={onBringToFront} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Lên một lớp (trên phần tử kế bên)">
        <ArrowUpToLine className="w-4 h-4" />
      </button>
      <button type="button" onClick={onSendToBack} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Xuống một lớp (dưới phần tử kế bên)">
        <ArrowDownToLine className="w-4 h-4" />
      </button>
      <div className="w-px h-5 bg-slate-200 mx-0.5" />
      <button type="button" onClick={onDuplicate} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Nhân bản">
        <Copy className="w-4 h-4" />
      </button>
      <button type="button" onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Xóa">
        <Trash2 className="w-4 h-4" />
      </button>
      {textFormat && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-0.5" />
          <span className="text-[11px] text-slate-500 px-0.5 whitespace-nowrap">Sửa chữ</span>
          <input
            type="number"
            min={8}
            max={120}
            value={textFormat.fontSize}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              textFormat.onFontSizeChange(Math.min(120, Math.max(8, Math.round(v))));
            }}
            className="w-11 text-center text-[11px] border border-slate-200 rounded px-0.5 py-0.5 text-slate-800"
            title="Cỡ chữ"
          />
          <select
            value={textFormat.fontFamily}
            onChange={(e) => textFormat.onFontFamilyChange(e.target.value)}
            className="max-w-[120px] text-[11px] border border-slate-200 rounded px-1 py-0.5 text-slate-800 bg-white"
            title="Font chữ"
          >
            {!fontOptions.includes(textFormat.fontFamily) && (
              <option value={textFormat.fontFamily}>{textFormat.fontFamily}</option>
            )}
            {fontOptions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <label
            className="cursor-pointer p-0.5 rounded hover:bg-slate-100 border border-transparent hover:border-slate-200 flex items-center"
            title="Màu chữ"
          >
            <span className="text-[13px] font-serif underline text-slate-700 leading-none px-0.5">A</span>
            <input
              type="color"
              value={textFormat.color}
              onChange={(e) => textFormat.onColorChange(e.target.value)}
              className="sr-only"
            />
            <span
              className="w-3.5 h-3.5 rounded border border-slate-200 ml-0.5"
              style={{ backgroundColor: textFormat.color }}
            />
          </label>
          <button
            type="button"
            onClick={textFormat.onBoldToggle}
            className={`p-1 rounded ${textFormat.fontWeight >= 600 ? "bg-indigo-100 text-indigo-800" : "hover:bg-slate-100 text-slate-600"}`}
            title="Đậm"
          >
            <Bold className="w-4 h-4" />
          </button>
          <div className="flex items-center border border-slate-200 rounded overflow-hidden">
            <button
              type="button"
              onClick={() => textFormat.onAlignChange("left")}
              className={`p-1 ${textFormat.textAlign === "left" ? "bg-slate-200" : "hover:bg-slate-50"}`}
              title="Căn trái"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => textFormat.onAlignChange("center")}
              className={`p-1 ${textFormat.textAlign === "center" ? "bg-slate-200" : "hover:bg-slate-50"}`}
              title="Căn giữa"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => textFormat.onAlignChange("right")}
              className={`p-1 ${textFormat.textAlign === "right" ? "bg-slate-200" : "hover:bg-slate-50"}`}
              title="Căn phải"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
      {showAddImage && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-0.5" />
          <button
            type="button"
            onClick={onAddImage}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e2d7d] hover:bg-[#162558] text-white text-[11px] font-medium"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            Thêm ảnh
          </button>
        </>
      )}
      {showEditHtml && onEditHtmlCode && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-0.5" />
          <button
            type="button"
            onClick={onEditHtmlCode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e2d7d] hover:bg-[#162558] text-white text-[11px] font-medium"
          >
            <Code2 className="w-3.5 h-3.5" />
            Sửa HTML
          </button>
        </>
      )}
      {showFormControls && (onAddFormField || onSaveFormData) && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-0.5" />
          {onAddFormField && (
            <button type="button" onClick={onAddFormField} className="px-2 py-1 rounded hover:bg-slate-100 text-[11px] font-medium text-slate-600" title="Thêm trường">
              Thêm Trường
            </button>
          )}
          {onSaveFormData && (
            <button type="button" onClick={onSaveFormData} className="px-2 py-1 rounded hover:bg-slate-100 text-[11px] font-medium text-slate-600" title="Lưu data">
              Lưu Data
            </button>
          )}
        </>
      )}
      {showChangeIcon && onRequestChangeIcon && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-0.5" />
          <button
            type="button"
            onClick={onRequestChangeIcon}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e2d7d] hover:bg-[#162558] text-white text-[11px] font-medium"
          >
            <Smile className="w-3.5 h-3.5" />
            Thay biểu tượng
          </button>
        </>
      )}
      {showLineControls && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-0.5" />
          {onRotateVertical && (
            <button type="button" onClick={onRotateVertical} className="px-2 py-1 rounded hover:bg-slate-100 text-[11px] font-medium text-slate-600" title="Xoay dọc">
              Xoay dọc
            </button>
          )}
          {lineThickness != null && (
            <span className="px-1.5 py-1 text-[11px] text-slate-600 font-medium min-w-[20px] text-center">{lineThickness}</span>
          )}
          {onColorChange && lineColor && (
            <label className="cursor-pointer p-0.5 rounded hover:bg-slate-100 border border-slate-200" title="Màu đường kẻ">
              <input type="color" value={lineColor} onChange={(e) => onColorChange(e.target.value)} className="sr-only" />
              <div className="w-5 h-5 rounded border border-slate-200" style={{ backgroundColor: lineColor }} />
            </label>
          )}
        </>
      )}
      <div className="w-px h-5 bg-slate-200 mx-0.5" />
      {onOpenSettings && (
        <button type="button" onClick={onOpenSettings} className="px-2 py-1 rounded hover:bg-slate-100 text-[#0f2167] text-[12px] font-medium whitespace-nowrap" title="Mở bảng thuộc tính">
          Chỉnh sửa
        </button>
      )}
      {onOpenSettings && (
        <button type="button" onClick={onOpenSettings} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Cài đặt">
          <Settings className="w-4 h-4" />
        </button>
      )}
      <button type="button" className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Trợ giúp">
        <HelpCircle className="w-4 h-4" />
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={onToggleMore}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
          title="Hành động khác"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {showMoreMenu && (
          <div className="absolute left-0 top-full mt-1 py-1 bg-white rounded-lg shadow-xl border border-slate-200 min-w-[200px] z-50">
            <button
              type="button"
              onClick={onToggleLock}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-slate-50 text-slate-700"
            >
              {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {isLocked ? "Mở khóa phần tử" : "Khóa phần tử"}
            </button>
            <button
              type="button"
              onClick={onToggleHide}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-slate-50 text-slate-700"
            >
              {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {isHidden ? "Hiện phần tử" : "Ẩn phần tử"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
