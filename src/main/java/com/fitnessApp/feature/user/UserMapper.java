package com.fitnessApp.feature.user;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public abstract class UserMapper {

    @org.springframework.beans.factory.annotation.Autowired
    protected com.fitnessApp.feature.workout.RoutineJsonService routineJsonService;

    @Mapping(target = "coach", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "videoLink", ignore = true)
    @Mapping(target = "routine", ignore = true)
    @Mapping(target = "nextRoutine", ignore = true)
    public abstract User toEntity(UserDto dto);

    @Mapping(target = "currentWeight", constant = "0.0")
    @Mapping(target = "compliance", constant = "0")
    @Mapping(target = "role", expression = "java(entity.getRole() != null ? entity.getRole().name() : null)")
    @Mapping(target = "onboardingCompleted", expression = "java(Boolean.TRUE.equals(entity.getOnboardingCompleted()))")
    @Mapping(target = "billingPlanId", ignore = true)
    @Mapping(target = "routineJson", ignore = true)
    @Mapping(target = "nextRoutineJson", ignore = true)
    public abstract UserDto toDto(User entity);

    @org.mapstruct.AfterMapping
    protected void afterToDto(User entity, @MappingTarget UserDto dto) {
        if (entity.getLastName() != null && entity.getLastName().equalsIgnoreCase(entity.getUsername())) {
            dto.setLastName(null);
        }
        if (entity.getRoutine() != null && routineJsonService != null) {
            dto.setRoutineJson(routineJsonService.toJson(entity.getRoutine()));
        }
        if (entity.getNextRoutine() != null && routineJsonService != null) {
            dto.setNextRoutineJson(routineJsonService.toJson(entity.getNextRoutine()));
        }
    }

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "coach", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "username", ignore = true)
    @Mapping(target = "videoLink", ignore = true)
    @Mapping(target = "routine", ignore = true)
    @Mapping(target = "nextRoutine", ignore = true)
    public abstract void updateEntityFromDto(UserDto dto, @MappingTarget User entity);
}
