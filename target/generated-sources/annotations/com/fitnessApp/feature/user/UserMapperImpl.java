package com.fitnessApp.feature.user;

import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-06-19T23:22:06+0200",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 25.0.3 (Eclipse Adoptium)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public User toEntity(UserDto dto) {
        if ( dto == null ) {
            return null;
        }

        User.UserBuilder user = User.builder();

        user.id( dto.getId() );
        user.email( dto.getEmail() );
        user.name( dto.getName() );
        if ( dto.getRole() != null ) {
            user.role( Enum.valueOf( Role.class, dto.getRole() ) );
        }
        user.username( dto.getUsername() );
        user.mustChangePassword( dto.isMustChangePassword() );
        user.onboardingCompleted( dto.isOnboardingCompleted() );
        user.lastName( dto.getLastName() );
        user.birthDate( dto.getBirthDate() );
        user.goal( dto.getGoal() );
        List<String> list = dto.getStrategies();
        if ( list != null ) {
            user.strategies( new ArrayList<String>( list ) );
        }
        user.status( dto.getStatus() );
        user.lastReviewDate( dto.getLastReviewDate() );
        user.nextReviewAt( dto.getNextReviewAt() );
        user.reviewFrequency( dto.getReviewFrequency() );
        user.progressionStrategy( dto.getProgressionStrategy() );
        user.routineJson( dto.getRoutineJson() );
        user.nextRoutineJson( dto.getNextRoutineJson() );
        user.personalRecordsJson( dto.getPersonalRecordsJson() );
        user.routineUpdatedAt( dto.getRoutineUpdatedAt() );
        user.routineStartDate( dto.getRoutineStartDate() );
        user.routineEndDate( dto.getRoutineEndDate() );

        return user.build();
    }

    @Override
    public UserDto toDto(User entity) {
        if ( entity == null ) {
            return null;
        }

        UserDto.UserDtoBuilder userDto = UserDto.builder();

        userDto.id( entity.getId() );
        userDto.email( entity.getEmail() );
        userDto.name( entity.getName() );
        userDto.lastName( entity.getLastName() );
        userDto.birthDate( entity.getBirthDate() );
        userDto.status( entity.getStatus() );
        userDto.goal( entity.getGoal() );
        List<String> list = entity.getStrategies();
        if ( list != null ) {
            userDto.strategies( new ArrayList<String>( list ) );
        }
        userDto.progressionStrategy( entity.getProgressionStrategy() );
        userDto.username( entity.getUsername() );
        userDto.mustChangePassword( entity.isMustChangePassword() );
        userDto.reviewFrequency( entity.getReviewFrequency() );
        userDto.routineJson( entity.getRoutineJson() );
        userDto.nextRoutineJson( entity.getNextRoutineJson() );
        userDto.personalRecordsJson( entity.getPersonalRecordsJson() );
        userDto.routineUpdatedAt( entity.getRoutineUpdatedAt() );
        userDto.routineStartDate( entity.getRoutineStartDate() );
        userDto.routineEndDate( entity.getRoutineEndDate() );
        userDto.lastReviewDate( entity.getLastReviewDate() );
        userDto.nextReviewAt( entity.getNextReviewAt() );
        userDto.createdAt( entity.getCreatedAt() );

        userDto.currentWeight( (double) 0.0 );
        userDto.compliance( 0 );
        userDto.role( entity.getRole() != null ? entity.getRole().name() : null );
        userDto.onboardingCompleted( Boolean.TRUE.equals(entity.getOnboardingCompleted()) );

        return userDto.build();
    }

    @Override
    public void updateEntityFromDto(UserDto dto, User entity) {
        if ( dto == null ) {
            return;
        }

        if ( dto.getEmail() != null ) {
            entity.setEmail( dto.getEmail() );
        }
        if ( dto.getName() != null ) {
            entity.setName( dto.getName() );
        }
        if ( dto.getRole() != null ) {
            entity.setRole( Enum.valueOf( Role.class, dto.getRole() ) );
        }
        entity.setMustChangePassword( dto.isMustChangePassword() );
        entity.setOnboardingCompleted( dto.isOnboardingCompleted() );
        if ( dto.getLastName() != null ) {
            entity.setLastName( dto.getLastName() );
        }
        if ( dto.getBirthDate() != null ) {
            entity.setBirthDate( dto.getBirthDate() );
        }
        if ( dto.getGoal() != null ) {
            entity.setGoal( dto.getGoal() );
        }
        if ( entity.getStrategies() != null ) {
            List<String> list = dto.getStrategies();
            if ( list != null ) {
                entity.getStrategies().clear();
                entity.getStrategies().addAll( list );
            }
        }
        else {
            List<String> list = dto.getStrategies();
            if ( list != null ) {
                entity.setStrategies( new ArrayList<String>( list ) );
            }
        }
        if ( dto.getStatus() != null ) {
            entity.setStatus( dto.getStatus() );
        }
        if ( dto.getLastReviewDate() != null ) {
            entity.setLastReviewDate( dto.getLastReviewDate() );
        }
        if ( dto.getNextReviewAt() != null ) {
            entity.setNextReviewAt( dto.getNextReviewAt() );
        }
        if ( dto.getReviewFrequency() != null ) {
            entity.setReviewFrequency( dto.getReviewFrequency() );
        }
        if ( dto.getProgressionStrategy() != null ) {
            entity.setProgressionStrategy( dto.getProgressionStrategy() );
        }
        if ( dto.getRoutineJson() != null ) {
            entity.setRoutineJson( dto.getRoutineJson() );
        }
        if ( dto.getNextRoutineJson() != null ) {
            entity.setNextRoutineJson( dto.getNextRoutineJson() );
        }
        if ( dto.getPersonalRecordsJson() != null ) {
            entity.setPersonalRecordsJson( dto.getPersonalRecordsJson() );
        }
        if ( dto.getRoutineUpdatedAt() != null ) {
            entity.setRoutineUpdatedAt( dto.getRoutineUpdatedAt() );
        }
        if ( dto.getRoutineStartDate() != null ) {
            entity.setRoutineStartDate( dto.getRoutineStartDate() );
        }
        if ( dto.getRoutineEndDate() != null ) {
            entity.setRoutineEndDate( dto.getRoutineEndDate() );
        }
    }
}
