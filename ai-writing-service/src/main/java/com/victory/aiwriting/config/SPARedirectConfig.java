package com.victory.aiwriting.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

@Configuration
public class SPARedirectConfig implements WebMvcConfigurer {

    private final ResourceLoader resourceLoader;

    public SPARedirectConfig(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
            .addResourceLocations(
                "file:ai-test-frontend/dist/",
                "classpath:/static/"
            )
            .resourceChain(true)
            .addResolver(new PathResourceResolver() {
                @Override
                protected Resource getResource(String resourcePath, Resource location) {
                    try {
                        var resource = super.getResource(resourcePath, location);
                        if (resource != null && resource.exists()) {
                            return resource;
                        }
                        var index = super.getResource("index.html", location);
                        if (index != null && index.exists()) {
                            return index;
                        }
                    } catch (Exception ignored) {}
                    return null;
                }
            });
    }
}