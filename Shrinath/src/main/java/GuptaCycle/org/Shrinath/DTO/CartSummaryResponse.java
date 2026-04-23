package GuptaCycle.org.Shrinath.DTO;

import java.math.BigDecimal;

public class CartSummaryResponse {
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal deliveryCharges;
    private BigDecimal finalTotal;
    private String couponCode;
    private String couponMessage;

    public CartSummaryResponse(BigDecimal subtotal,
                               BigDecimal discountAmount,
                               BigDecimal deliveryCharges,
                               BigDecimal finalTotal,
                               String couponCode,
                               String couponMessage) {
        this.subtotal = subtotal;
        this.discountAmount = discountAmount;
        this.deliveryCharges = deliveryCharges;
        this.finalTotal = finalTotal;
        this.couponCode = couponCode;
        this.couponMessage = couponMessage;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public BigDecimal getDeliveryCharges() {
        return deliveryCharges;
    }

    public BigDecimal getFinalTotal() {
        return finalTotal;
    }

    public String getCouponCode() {
        return couponCode;
    }

    public String getCouponMessage() {
        return couponMessage;
    }
}
