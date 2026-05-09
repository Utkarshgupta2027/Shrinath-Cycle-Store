package GuptaCycle.org.Shrinath;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class ShrinathApplication {

	public static void main(String[] args) {
		SpringApplication.run(ShrinathApplication.class, args);
	}

}
