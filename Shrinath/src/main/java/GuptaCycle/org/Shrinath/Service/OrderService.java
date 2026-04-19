package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.Model.*;
import GuptaCycle.org.Shrinath.Repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepo;

    public Order saveOrder(OrderRequest req) {

        Order order = new Order();
        order.setUserId(req.getUserId());
        order.setTotalAmount(req.getTotalAmount());
        order.setAddress(req.getAddress());

        List<OrderItem> items = req.getItems().stream()
                .map(i -> {
                    OrderItem item = new OrderItem();
                    item.setProductId(i.getProductId());
                    item.setName(i.getName());
                    item.setPrice(i.getPrice());
                    return item;
                })
                .collect(Collectors.toList());

        order.setItems(items);

        return orderRepo.save(order);
    }

    public List<Order> getOrdersByUser(Long userId) {
        return orderRepo.findByUserId(userId);
    }
}
