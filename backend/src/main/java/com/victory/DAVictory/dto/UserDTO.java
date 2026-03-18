package com.victory.DAVictory.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class UserDTO {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String avatar;
    private Boolean isActive;
    private LocalDateTime lastLogin;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
    private LocalDate birthday;
    private String nationality;
    private String studyLevel;
    private String targetBand;
    private String bio;
    private List<String> roles;
}
