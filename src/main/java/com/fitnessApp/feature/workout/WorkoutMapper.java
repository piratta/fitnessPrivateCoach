package com.fitnessApp.feature.workout;

import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface WorkoutMapper {

    WorkoutDto toDto(WorkoutSession entity);

}
