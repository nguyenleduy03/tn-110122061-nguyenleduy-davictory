package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.RegisterRequest;
import com.victory.DAVictory.dto.UserDTO;
import com.victory.DAVictory.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "User Management", description = "API quản lý người dùng")
public class UserController {
    
    private final UserService userService;
    
    // Đăng ký user mới
    @PostMapping("/register")
    @Operation(summary = "Đăng ký user mới", description = "Tạo tài khoản người dùng mới với role mặc định là STUDENT")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Đăng ký thành công"),
        @ApiResponse(responseCode = "400", description = "Thông tin không hợp lệ hoặc username/email đã tồn tại")
    })
    public ResponseEntity<UserDTO> register(@RequestBody RegisterRequest request) {
        try {
            UserDTO user = userService.registerUser(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(user);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Lấy tất cả users
    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả users", description = "Trả về danh sách tất cả người dùng trong hệ thống")
    @ApiResponse(responseCode = "200", description = "Lấy danh sách thành công")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        List<UserDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }
    
    // Lấy user theo ID
    @GetMapping("/{id}")
    @Operation(summary = "Lấy user theo ID", description = "Trả về thông tin chi tiết của một user")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Tìm thấy user"),
        @ApiResponse(responseCode = "404", description = "Không tìm thấy user")
    })
    public ResponseEntity<UserDTO> getUserById(
            @Parameter(description = "ID của user", required = true) @PathVariable Long id) {
        try {
            UserDTO user = userService.getUserById(id);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    // Lấy user theo username
    @GetMapping("/username/{username}")
    @Operation(summary = "Lấy user theo username", description = "Tìm user bằng tên đăng nhập")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Tìm thấy user"),
        @ApiResponse(responseCode = "404", description = "Không tìm thấy user")
    })
    public ResponseEntity<UserDTO> getUserByUsername(
            @Parameter(description = "Tên đăng nhập", required = true) @PathVariable String username) {
        try {
            UserDTO user = userService.getUserByUsername(username);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    // Lấy users theo role
    @GetMapping("/role/{roleName}")
    @Operation(summary = "Lấy users theo quyền", description = "Lọc danh sách users theo vai trò (GUEST, STUDENT, TEACHER, MANAGER, ADMIN)")
    @ApiResponse(responseCode = "200", description = "Lấy danh sách thành công")
    public ResponseEntity<List<UserDTO>> getUsersByRole(
            @Parameter(description = "Tên vai trò của user", required = true) @PathVariable String roleName) {
        List<UserDTO> users = userService.getUsersByRoleName(roleName);
        return ResponseEntity.ok(users);
    }
    
    // Thêm role cho user
    @PostMapping("/{id}/roles/{roleName}")
    @Operation(summary = "Thêm quyền cho user", description = "Gán thêm một vai trò cho user (chỉ admin mới có quyền)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Thêm quyền thành công"),
        @ApiResponse(responseCode = "404", description = "Không tìm thấy user hoặc role")
    })
    public ResponseEntity<UserDTO> addRoleToUser(
            @Parameter(description = "ID của user", required = true) @PathVariable Long id,
            @Parameter(description = "Tên vai trò cần thêm", required = true) @PathVariable String roleName) {
        try {
            UserDTO user = userService.addRoleToUser(id, roleName);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    // Xóa role khỏi user
    @DeleteMapping("/{id}/roles/{roleName}")
    @Operation(summary = "Xóa quyền của user", description = "Gỡ bỏ một vai trò khỏi user (chỉ admin mới có quyền)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Xóa quyền thành công"),
        @ApiResponse(responseCode = "404", description = "Không tìm thấy user hoặc role")
    })
    public ResponseEntity<UserDTO> removeRoleFromUser(
            @Parameter(description = "ID của user", required = true) @PathVariable Long id,
            @Parameter(description = "Tên vai trò cần xóa", required = true) @PathVariable String roleName) {
        try {
            UserDTO user = userService.removeRoleFromUser(id, roleName);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    // Cập nhật thông tin user
    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin user", description = "Chỉnh sửa thông tin cá nhân của user")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Cập nhật thành công"),
        @ApiResponse(responseCode = "404", description = "Không tìm thấy user")
    })
    public ResponseEntity<UserDTO> updateUser(
            @Parameter(description = "ID của user", required = true) @PathVariable Long id,
            @RequestBody UserDTO userDTO) {
        try {
            UserDTO user = userService.updateUser(id, userDTO);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    // Xóa user
    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa user", description = "Xóa user khỏi hệ thống (chỉ admin có quyền)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Xóa thành công"),
        @ApiResponse(responseCode = "404", description = "Không tìm thấy user")
    })
    public ResponseEntity<Void> deleteUser(
            @Parameter(description = "ID của user cần xóa", required = true) @PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
