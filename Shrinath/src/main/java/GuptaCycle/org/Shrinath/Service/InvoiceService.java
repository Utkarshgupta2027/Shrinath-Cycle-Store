package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.Model.Order;
import GuptaCycle.org.Shrinath.Model.OrderItem;
import GuptaCycle.org.Shrinath.Model.StoreSettings;
import GuptaCycle.org.Shrinath.Model.User;
import GuptaCycle.org.Shrinath.Repository.UserRepository;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Feature 13 — Generates a GST-compliant PDF invoice using iText 7.
 */
@Service
public class InvoiceService {

    private static final DeviceRgb BRAND_BLUE   = new DeviceRgb(30, 64, 175);
    private static final DeviceRgb LIGHT_GRAY   = new DeviceRgb(245, 245, 245);
    private static final DeviceRgb DARK_GRAY    = new DeviceRgb(55, 65, 81);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    @Autowired
    private StoreSettingsService storeSettingsService;

    @Autowired
    private UserRepository userRepository;

    /**
     * Generates a PDF invoice byte array for the given order.
     */
    public byte[] generateInvoice(Order order) throws IOException {
        StoreSettings settings = storeSettingsService.getSettings();
        User customer = userRepository.findById(order.getUserId()).orElse(null);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document doc = new Document(pdf, PageSize.A4);
        doc.setMargins(36, 36, 36, 36);

        PdfFont bold    = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);

        // ── Header ─────────────────────────────────────────────────────────────
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{60, 40}))
                .setWidth(UnitValue.createPercentValue(100))
                .setBorder(Border.NO_BORDER);

        // Store info (left)
        Cell storeCell = new Cell().setBorder(Border.NO_BORDER);
        storeCell.add(new Paragraph(settings.getStoreName())
                .setFont(bold).setFontSize(20).setFontColor(BRAND_BLUE));
        storeCell.add(new Paragraph(settings.getStoreAddress())
                .setFont(regular).setFontSize(9).setFontColor(DARK_GRAY));
        storeCell.add(new Paragraph("Phone: " + settings.getStorePhone())
                .setFont(regular).setFontSize(9).setFontColor(DARK_GRAY));
        storeCell.add(new Paragraph("Email: " + settings.getStoreEmail())
                .setFont(regular).setFontSize(9).setFontColor(DARK_GRAY));
        storeCell.add(new Paragraph("GSTIN: " + settings.getGstin())
                .setFont(bold).setFontSize(9).setFontColor(DARK_GRAY));
        headerTable.addCell(storeCell);

        // Invoice title (right)
        Cell titleCell = new Cell().setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT);
        titleCell.add(new Paragraph("TAX INVOICE")
                .setFont(bold).setFontSize(18).setFontColor(BRAND_BLUE));
        titleCell.add(new Paragraph("Invoice No: INV-" + order.getId())
                .setFont(bold).setFontSize(10));
        if (order.getOrderDate() != null) {
            titleCell.add(new Paragraph("Date: " + order.getOrderDate().format(DATE_FMT))
                    .setFont(regular).setFontSize(9));
        }
        titleCell.add(new Paragraph("Status: " + (order.getStatus() != null ? order.getStatus() : "PENDING"))
                .setFont(regular).setFontSize(9));
        headerTable.addCell(titleCell);
        doc.add(headerTable);

        // Divider
        doc.add(new LineSeparator(new com.itextpdf.kernel.pdf.canvas.draw.SolidLine(1f))
                .setMarginTop(8).setMarginBottom(8));

        // ── Bill To / Order Info ───────────────────────────────────────────────
        Table infoTable = new Table(UnitValue.createPercentArray(new float[]{50, 50}))
                .setWidth(UnitValue.createPercentValue(100))
                .setBorder(Border.NO_BORDER)
                .setMarginBottom(12);

        Cell billToCell = new Cell().setBorder(Border.NO_BORDER);
        billToCell.add(new Paragraph("Bill To:").setFont(bold).setFontSize(10).setFontColor(BRAND_BLUE));
        if (customer != null) {
            billToCell.add(new Paragraph(customer.getName() != null ? customer.getName() : "Customer")
                    .setFont(bold).setFontSize(10));
            billToCell.add(new Paragraph("Phone: " + (customer.getPhoneNumber() != null ? customer.getPhoneNumber() : ""))
                    .setFont(regular).setFontSize(9));
            billToCell.add(new Paragraph("Email: " + (customer.getEmail() != null ? customer.getEmail() : ""))
                    .setFont(regular).setFontSize(9));
        }
        if (order.getAddress() != null) {
            billToCell.add(new Paragraph("Address: " + order.getAddress())
                    .setFont(regular).setFontSize(9));
        }
        infoTable.addCell(billToCell);

        Cell orderInfoCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT);
        orderInfoCell.add(new Paragraph("Payment Method: " + (order.getPaymentMethod() != null ? order.getPaymentMethod() : "COD"))
                .setFont(regular).setFontSize(9));
        orderInfoCell.add(new Paragraph("Payment Status: " + (order.getPaymentStatus() != null ? order.getPaymentStatus() : "PENDING"))
                .setFont(regular).setFontSize(9));
        if (order.getPaymentId() != null) {
            orderInfoCell.add(new Paragraph("Payment ID: " + order.getPaymentId())
                    .setFont(regular).setFontSize(9));
        }
        infoTable.addCell(orderInfoCell);
        doc.add(infoTable);

        // ── Items Table ────────────────────────────────────────────────────────
        Table itemsTable = new Table(UnitValue.createPercentArray(new float[]{30, 15, 10, 10, 10, 12, 13}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(8);

        // Table headers
        String[] headers = {"Product", "Category", "Qty", "Unit Price", "GST%", "GST Amt", "Total"};
        for (String h : headers) {
            itemsTable.addHeaderCell(new Cell()
                    .setBackgroundColor(BRAND_BLUE)
                    .add(new Paragraph(h).setFont(bold).setFontSize(9).setFontColor(ColorConstants.WHITE))
                    .setPadding(6));
        }

        List<OrderItem> items = order.getItems() != null ? order.getItems() : List.of();
        double totalGst = 0;
        double totalBeforeGst = 0;
        boolean alternateRow = false;

        for (OrderItem item : items) {
            double unitPrice    = item.getPrice();
            int    qty          = item.getQuantity();
            double gstRate      = storeSettingsService.getGstRate(item.getCategory());
            double lineBase     = unitPrice * qty;
            // Price is assumed GST-inclusive → extract GST component
            double lineBaseExclGst = lineBase / (1 + gstRate);
            double lineGst      = lineBase - lineBaseExclGst;
            String gstPct       = String.format("%.0f%%", gstRate * 100);

            totalBeforeGst += lineBaseExclGst;
            totalGst       += lineGst;

            com.itextpdf.kernel.colors.Color rowBg = alternateRow
                    ? LIGHT_GRAY : ColorConstants.WHITE;
            alternateRow = !alternateRow;

            itemsTable.addCell(rowCell(item.getName(), regular, rowBg));
            itemsTable.addCell(rowCell(item.getCategory() != null ? item.getCategory() : "—", regular, rowBg));
            itemsTable.addCell(rowCell(String.valueOf(qty), regular, rowBg));
            itemsTable.addCell(rowCell("₹" + String.format("%.2f", unitPrice), regular, rowBg));
            itemsTable.addCell(rowCell(gstPct, regular, rowBg));
            itemsTable.addCell(rowCell("₹" + String.format("%.2f", lineGst), regular, rowBg));
            itemsTable.addCell(rowCell("₹" + String.format("%.2f", lineBase), regular, rowBg));
        }
        doc.add(itemsTable);

        // ── GST Summary ────────────────────────────────────────────────────────
        double cgst = totalGst / 2;
        double sgst = totalGst / 2;
        double grandTotal = order.getTotalAmount();

        Table summaryTable = new Table(UnitValue.createPercentArray(new float[]{70, 30}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginTop(4);

        addSummaryRow(summaryTable, "Taxable Amount (excl. GST)",
                "₹" + String.format("%.2f", totalBeforeGst), regular, bold, false);
        addSummaryRow(summaryTable, "CGST",
                "₹" + String.format("%.2f", cgst), regular, bold, false);
        addSummaryRow(summaryTable, "SGST",
                "₹" + String.format("%.2f", sgst), regular, bold, false);

        if (order.getDiscountAmount() > 0) {
            addSummaryRow(summaryTable, "Coupon Discount (" + (order.getCouponCode() != null ? order.getCouponCode() : "") + ")",
                    "- ₹" + String.format("%.2f", order.getDiscountAmount()), regular, bold, false);
        }
        if (order.getDeliveryCharges() > 0) {
            addSummaryRow(summaryTable, "Delivery Charges",
                    "₹" + String.format("%.2f", order.getDeliveryCharges()), regular, bold, false);
        }

        addSummaryRow(summaryTable, "Grand Total",
                "₹" + String.format("%.2f", grandTotal), bold, bold, true);
        doc.add(summaryTable);

        // ── Footer ─────────────────────────────────────────────────────────────
        doc.add(new LineSeparator(new com.itextpdf.kernel.pdf.canvas.draw.SolidLine(0.5f))
                .setMarginTop(16));
        doc.add(new Paragraph("This is a computer-generated invoice and does not require a physical signature.")
                .setFont(regular).setFontSize(8).setFontColor(DARK_GRAY)
                .setTextAlignment(TextAlignment.CENTER).setMarginTop(8));
        doc.add(new Paragraph("Thank you for shopping at " + settings.getStoreName() + "!")
                .setFont(bold).setFontSize(9).setFontColor(BRAND_BLUE)
                .setTextAlignment(TextAlignment.CENTER));

        doc.close();
        return baos.toByteArray();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Cell rowCell(String text, PdfFont font, com.itextpdf.kernel.colors.Color bg) {
        return new Cell()
                .setBackgroundColor(bg)
                .add(new Paragraph(text).setFont(font).setFontSize(9))
                .setPadding(5)
                .setBorder(new SolidBorder(new DeviceRgb(229, 231, 235), 0.5f));
    }

    private void addSummaryRow(Table table, String label, String value,
                               PdfFont labelFont, PdfFont valueFont, boolean highlight) {
        DeviceRgb bg = highlight ? BRAND_BLUE : null;
        DeviceRgb fg = highlight ? new DeviceRgb(255, 255, 255) : DARK_GRAY;

        Cell labelCell = new Cell()
                .add(new Paragraph(label).setFont(labelFont).setFontSize(9).setFontColor(fg))
                .setPadding(5)
                .setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT);
        Cell valueCell = new Cell()
                .add(new Paragraph(value).setFont(valueFont).setFontSize(9).setFontColor(fg))
                .setPadding(5)
                .setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT);
        if (highlight) {
            labelCell.setBackgroundColor(BRAND_BLUE);
            valueCell.setBackgroundColor(BRAND_BLUE);
        }
        table.addCell(labelCell);
        table.addCell(valueCell);
    }
}
