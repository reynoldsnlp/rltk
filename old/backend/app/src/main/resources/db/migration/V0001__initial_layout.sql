CREATE TABLE Task (
       ID int auto_increment primary key not null,
       UserId varchar not null,
       Url varchar not null,
       Title varchar not null,
       Topic varchar(128) not null,
       Activity varchar(128) not null,
       Language varchar(3) not null,
       Filter varchar(128) not null,
       Timestamp Date not null,
       NumberOfEnhancements int not null,
);

-- Allow per-user queries on Task, e.g. to retrieve all tasks for a user
CREATE INDEX UserIndex ON Task (UserId);

CREATE TABLE Submission (
       ID bigint auto_increment primary key not null,
       TaskId int not null,
       EnhancementId varchar(128) not null,
       Submission varchar(256) not null,
       Feedback varchar(256) not null,
       FeedbackText varchar not null,
       Timestamp Timestamp not null,
       FOREIGN KEY (TaskId) REFERENCES Task(ID)
);

CREATE TABLE Performance (
       TaskId int not null,
       EnhancementId varchar(128) not null,
       OriginalText varchar(256) not null,
       NumberOfTries int not null,
       UsedSolution boolean not null,
       Sentence varchar not null,
       Feedback varchar(256) not null,
       PRIMARY KEY(TaskId, EnhancementId),
       FOREIGN KEY (TaskId) REFERENCES Task(ID)
);
