package GuptaCycle.org.Shrinath.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000") // Allow React frontend
public class HomeController {

   @GetMapping("/Home")
    public String sayHello() {
        return "SHREE  RADHA...";
    }
    @GetMapping("/about")
    public  String aboutus(){
       return "About mee";
    }

//    @Autowired
//    private ProductRepository repo;
//
//    @GetMapping("/product")
//    public List<Product> getAllProducts() {
//        return repo.findAll();
//    }


}

