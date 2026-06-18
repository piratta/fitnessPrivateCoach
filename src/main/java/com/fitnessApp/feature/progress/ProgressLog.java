package com.fitnessApp.feature.progress;

import com.fitnessApp.feature.user.User;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "progress_logs",
       uniqueConstraints = @UniqueConstraint(name = "uk_progress_client_date", columnNames = {"client_id", "logDate"}))
public class ProgressLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    @JsonIgnore
    private User client;

    @Column(nullable = false)
    private LocalDate logDate;

    private Double weight;
    private Double waist;
    private Double hip;
    private Double neck;
    private Double biceps;
    private Double leg;
    private Double chest;
    private Double calf;
    private Double forearm;
    private Double back;

    public ProgressLog() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getClient() { return client; }
    public void setClient(User client) { this.client = client; }

    public LocalDate getLogDate() { return logDate; }
    public void setLogDate(LocalDate logDate) { this.logDate = logDate; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public Double getWaist() { return waist; }
    public void setWaist(Double waist) { this.waist = waist; }

    public Double getHip() { return hip; }
    public void setHip(Double hip) { this.hip = hip; }

    public Double getNeck() { return neck; }
    public void setNeck(Double neck) { this.neck = neck; }

    public Double getBiceps() { return biceps; }
    public void setBiceps(Double biceps) { this.biceps = biceps; }

    public Double getLeg() { return leg; }
    public void setLeg(Double leg) { this.leg = leg; }

    public Double getChest() { return chest; }
    public void setChest(Double chest) { this.chest = chest; }

    public Double getCalf() { return calf; }
    public void setCalf(Double calf) { this.calf = calf; }

    public Double getForearm() { return forearm; }
    public void setForearm(Double forearm) { this.forearm = forearm; }

    public Double getBack() { return back; }
    public void setBack(Double back) { this.back = back; }
}
