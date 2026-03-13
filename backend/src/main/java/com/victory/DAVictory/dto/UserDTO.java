package com.victory.DAVictory.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class UserDTO {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private Boolean isActive;
    private LocalDateTime lastLogin;
    private List<String> roles;
}
