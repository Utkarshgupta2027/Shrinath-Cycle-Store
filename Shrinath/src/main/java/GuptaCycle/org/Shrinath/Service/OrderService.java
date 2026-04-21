package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.Model.*;
import GuptaCycle.org.Shrinath.Repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepo;

    public Order saveOrder(OrderRequest req) {
        if (req == null || req.getUserId() == null) {
            throw new IllegalArgumentException("A valid user is required to place an order.");
        }

        if (CollectionUtils.isEmpty(req.getItems())) {
            throw new IllegalArgumentException("Order must contain at least one item.");
        }

        Order order = new Order();
        order.setUserId(req.getUserId());

        List<OrderItem> items = req.getItems().stream()
                .map(i -> {
                    OrderItem item = new OrderItem();
                    item.setProductId(i.getProductId());
                    item.setName(i.getName());
                    item.setPrice(i.getPrice());
                    item.setQuantity(Math.max(i.getQuantity(), 1));
                    return item;
                })
                .collect(Collectors.toList());

        double totalAmount = items.stream()
                .mapToDouble(item -> item.getPrice() * item.getQuantity())
                .sum();

        order.setTotalAmount(totalAmount);
        order.setAddress(req.getAddress());
        order.setItems(items);

        return orderRepo.save(order);
    }

    public List<Order> getOrdersByUser(Long userId) {
        return orderRepo.findByUserId(userId);
    }
}
