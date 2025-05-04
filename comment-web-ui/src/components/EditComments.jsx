import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import TagTree from "./TagTree";
import Tag from "./Tag";

// todo emotion and sentiment lists being loaded from server
const emotions = [
    { desc: 'Не проанализирован', name: 'null', color: '#888888' },
    { desc: 'Радость', name: 'joy', color: '#00BB00' },
    { desc: 'Злость', name: 'anger', color: '#EE0000' },
    { desc: 'Страх', name: 'fear', color: '#7F2180' },
    { desc: 'Удивление', name: 'surprise', color: '#22ACBB' },
    { desc: 'Грусть', name: 'sadness', color: '#152BA7' },
    { desc: 'Нет эмоции', name: 'neutral', color: '#AAAAAA' },
];

const sentiments = [
    { desc: 'Не проанализирован', name: 'null', color: '#888888' },
    { desc: 'Позитивный', name: 'positive', color: '#00BB00' },
    { desc: 'Нейтральный', name: 'neutral', color: '#AAAAAA' },
    { desc: 'Негативный', name: 'negative', color: '#EE0000' },
];

const EditComments = ({ open, setOpen, onClose, onEdit, amount, singleComment, tags }) => {

    const [newText, setNewText] = useState('');
    const [newEmotion, setNewEmotion] = useState('null');
    const [newSentiment, setNewSentiment] = useState('null');
    const [newTags, setNewTags] = useState([]);
    const [tagsToDelete, setTagsToDelete] = useState([]);

    useEffect(() => {
        if (!singleComment) return;
        setNewText(singleComment.text);
        setNewEmotion(singleComment.emotion);
        setNewSentiment(singleComment.sentiment);
    }, [singleComment]);

    return <Dialog
        open={open}
        onClose={onClose}
        maxWidth={'70vw'}
    >
        <DialogTitle
            align="center"
            sx={{ pb: 1.25 }}
        >
            Редактирование комментари{singleComment ? 'я' : 'ев'}
        </DialogTitle>
        <DialogContent>
            <Typography
                align="center"
                sx={{ color: 'green', mb: 0.5 }}
            >
                {editDialogInfo(amount)}
            </Typography>
            <Stack direction="row" gap={2.5}>
                <TagTree
                    tags={tags}
                    onTagClick={() => { }}
                    onTagEdit={null}
                    maxHeight={'50vh'}
                    createBtn={<React.Fragment key={'tag-tree-empty-btn'} />}
                />
                <Stack direction="column">
                    {singleComment && <TextField
                        label="Текст комментария"
                        variant="outlined"
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                        fullWidth
                        margin="normal"
                    />}
                    <Stack direction="row" gap={1.5} sx={{ mt: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel id="edit-comment-sentiment-label" shrink>Настроение</InputLabel>
                            <Select
                                labelId="edit-comment-sentiment-label"
                                value={newSentiment}
                                label="Настроение"
                                onChange={e => setNewSentiment(e.target.value)}
                                required
                                displayEmpty
                                renderValue={value => tagBySentiment(sentiments.find(em => em.name === value))}
                                sx={{ width: '200px' }}
                            >
                                {sentiments.map(sentiment => (
                                    <MenuItem
                                        key={sentiment.name}
                                        value={sentiment.name}
                                    >
                                        {tagBySentiment(sentiment)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel id="edit-comment-emotion-label" shrink>Эмоция</InputLabel>
                            <Select
                                labelId="edit-comment-emotion-label"
                                value={newEmotion}
                                label="Эмоция"
                                onChange={e => setNewEmotion(e.target.value)}
                                displayEmpty
                                renderValue={value => tagBySentiment(emotions.find(em => em.name === value))}
                                sx={{ width: '200px' }}
                            >
                                {emotions.map(emotion => (
                                    <MenuItem
                                        key={emotion.name}
                                        value={emotion.name}
                                    >
                                        {tagBySentiment(emotion)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </Stack>
            </Stack>
        </DialogContent>
        <DialogActions>
            <Button
                color="error"
                variant="outlined"
                onClick={onClose}
            >Отмена</Button>
            <Button
                color="success"
                variant="contained"
            >Сохранить изменения</Button>
        </DialogActions>
    </Dialog>;
}

function editDialogInfo(amount) {
    if (amount === 1) {
        return 'Для редактирования был выбран 1 комментарий';
    }
    let ending = 'ев';
    if (amount % 100 < 11 && amount % 100 < 19) {
        if (amount % 10 === 1)
            ending = 'й';
        else if (amount % 10 > 1 && amount % 10 < 5)
            ending = 'я';
    }
    return `Для редактирования было выбрано ${amount} комментари${ending}`;
}

function tagBySentiment(obj) {
    return obj && <Tag
        text={obj.desc}
        color={obj.color}
        styles={{ color: 'white' }}
    />;
}

export default EditComments;