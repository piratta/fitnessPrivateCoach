package com.fitnessApp.feature.user;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface UserMapper {

    @Mapping(target = "coach", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "videoLink", ignore = true)
    User toEntity(UserDto dto);

    @Mapping(target = "currentWeight", constant = "0.0")
    @Mapping(target = "compliance", constant = "0")
    @Mapping(target = "role", expression = "java(entity.getRole() != null ? entity.getRole().name() : null)")
    @Mapping(target = "onboardingCompleted", expression = "java(Boolean.TRUE.equals(entity.getOnboardingCompleted()))")
    @Mapping(target = "billingPlanId", ignore = true)
    UserDto toDto(User entity);

    @org.mapstruct.AfterMapping
    default void afterToDto(User entity, @MappingTarget UserDto dto) {
        if (entity.getLastName() != null && entity.getLastName().equalsIgnoreCase(entity.getUsername())) {
            dto.setLastName(null);
        }
    }

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "coach", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "username", ignore = true)
    @Mapping(target = "videoLink", ignore = true)
    void updateEntityFromDto(UserDto dto, @MappingTarget User entity);
}
