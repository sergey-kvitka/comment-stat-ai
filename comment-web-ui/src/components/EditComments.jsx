import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControl, InputLabel, MenuItem, Select, Stack, TextField,
    Typography, RadioGroup, FormControlLabel, Radio, Checkbox
} from "@mui/material";
import React, { useState, useEffect, useCallback } from "react";
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

const EditComments = ({ open, onClose, onEdit, amount, singleComment, tags }) => {

    const [newText, setNewText] = useState("");
    const [newEmotion, setNewEmotion] = useState("null");
    const [newSentiment, setNewSentiment] = useState("null");
    const [newTags, setNewTags] = useState([]);
    const [tagsToDelete, setTagsToDelete] = useState([]);

    const [applyEmotion, setApplyEmotion] = useState(true);
    const [applySentiment, setApplySentiment] = useState(true);

    const [addTagsSwitch, setAddTagsSwitch] = useState(true);

    useEffect(() => {
        if (singleComment) {
            setNewText(singleComment.text);
            setNewEmotion(singleComment.emotion);
            setNewSentiment(singleComment.sentiment);
            setApplyEmotion(true);
            setApplySentiment(true);
        } else {
            setNewEmotion("null");
            setNewSentiment("null");
            setApplyEmotion(false);
            setApplySentiment(false);
        }
    }, [singleComment]);

    const removeTagFromList = useCallback((id, setNewList) => {
        setNewList(prev => [...prev.filter(t => t.id !== id)]);
    }, []);

    const renderTag = useCallback((tag, setTagList) => <Tag
        key={tag.id}
        text={tag.name}
        color={tag.color}
        onClick={() => removeTagFromList(tag.id, setTagList)}
        styles={{
            mb: '5px !important',
            '&:hover': { bgcolor: tag.color, opacity: 0.8 }
        }}
    />, [removeTagFromList]);

    const handleTagClick = useCallback(tag => {
        const [tagList, setTagList] = (
            addTagsSwitch ? [newTags, setNewTags] : [tagsToDelete, setTagsToDelete]
        );
        if (!tagList.some(t => t.id === tag.id)) {
            setTagList(prev => [...prev, tag]);
        }
    }, [addTagsSwitch, newTags, setNewTags, tagsToDelete, setTagsToDelete]);

    const editComments = useCallback(() => {
        onEdit(
            {
                text: singleComment && newText,
                emotion: applyEmotion ? (newEmotion === "null" ? null : newEmotion) : undefined,
                sentiment: applySentiment ? (newSentiment === "null" ? null : newSentiment) : undefined,
                tagsToAdd: newTags.map(t => t.id),
                tagsToDelete: tagsToDelete.map(t => t.id)
            },
            () => {
                setNewTags([]);
                setTagsToDelete([]);
            }
        );
    }, [
        singleComment, onEdit, newText, newEmotion, newSentiment,
        newTags, tagsToDelete, applyEmotion, applySentiment
    ]);

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
        <DialogContent sx={{ pb: 0 }}>
            <Typography
                align="center"
                sx={{ color: 'green', mb: 0.5 }}
            >
                {editDialogInfo(amount)}
            </Typography>
            <Stack direction="row" gap={2.5}>
                <TagTree
                    tags={tags}
                    onTagClick={handleTagClick}
                    onTagEdit={null}
                    maxHeight={'50vh'}
                    createBtn={<React.Fragment key={'tag-tree-empty-btn'} />}
                />
                <Stack direction="column">
                    {singleComment && <TextField
                        label="Текст комментария"
                        variant="outlined"
                        multiline
                        rows={2}
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                        fullWidth
                        margin="normal"
                    />}
                    <Stack direction="row" gap={1.5} sx={{ mt: 2, mb: 2 }}>
                        <Checkbox
                            checked={applySentiment}
                            onChange={e => setApplySentiment(e.target.checked)}
                        />
                        <FormControl
                            fullWidth
                            sx={{ opacity: applySentiment ? 1 : 0.5 }}
                        >
                            <InputLabel id="edit-comment-sentiment-label" shrink>Настроение</InputLabel>
                            <Select
                                labelId="edit-comment-sentiment-label"
                                value={newSentiment}
                                label="Настроение"
                                onChange={e => setNewSentiment(e.target.value)}
                                disabled={!applySentiment}
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
                        <Checkbox
                            checked={applyEmotion}
                            onChange={e => setApplyEmotion(e.target.checked)}
                        />
                        <FormControl
                            fullWidth
                            sx={{ opacity: applyEmotion ? 1 : 0.5 }}
                        >
                            <InputLabel id="edit-comment-emotion-label" shrink>Эмоция</InputLabel>
                            <Select
                                labelId="edit-comment-emotion-label"
                                value={newEmotion}
                                label="Эмоция"
                                onChange={e => setNewEmotion(e.target.value)}
                                disabled={!applyEmotion}
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
                    <RadioGroup
                        name="tag-include-exclude"
                        value={addTagsSwitch}
                        onChange={e => setAddTagsSwitch(e.target.value === 'true')}
                    >
                        {[
                            { formValue: true, formLabel: 'Добавить:', tagList: newTags, setTagList: setNewTags },
                            { formValue: false, formLabel: 'Удалить:', tagList: tagsToDelete, setTagList: setTagsToDelete },
                        ].map(row => (
                            <Stack
                                key={row.formLabel}
                                direction="row"
                                sx={{
                                    width: '30vw', mb: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <FormControlLabel value={row.formValue} label={row.formLabel} control={<Radio />} />
                                <Stack direction="row" flexWrap="wrap" spacing={0.5}>
                                    {row.tagList.map(tag => renderTag(tag, row.setTagList))}
                                </Stack>
                            </Stack>
                        ))}
                    </RadioGroup>
                </Stack>
            </Stack>
        </DialogContent>
        <DialogActions sx={{ pt: 0 }}>
            <Button
                color="error"
                variant="outlined"
                onClick={onClose}
            >Отмена</Button>
            <Button
                color="success"
                variant="contained"
                onClick={editComments}
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