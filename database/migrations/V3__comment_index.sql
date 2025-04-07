create index idx_comment_user      on comments(user_id);
create index idx_comment_tag       on comments(tag_id);
create index idx_comment_sentiment on comments(sentiment_id);
create index idx_comment_emotion   on comments(emotion_id);
