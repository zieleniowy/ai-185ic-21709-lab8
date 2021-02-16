import React from 'react';
import { Container, Box, Dialog, DialogTitle, DialogContent, TextField, Button,
List, ListItem, ListItemText, Grid, Card, CardContent, CardHeader, Typography } from '@material-ui/core';
import { useSnackbar } from 'notistack';
import fetch from './fetch';

const LoginForm = props => {
  const [login, setLogin] = React.useState("");
  const [pass, setPass] = React.useState("");
  const handleChange = setter => e =>setter(e.target.value);
  const handleSend = ()=>{
    fetch("/auth", { method: "POST", body: { login, pass } })
      .then(props.onSuccess)
      .catch(props.onError)
  }
  return (
    <Dialog open={true} maxWidth="xs" fullWidth>
      <DialogTitle>Wymagana autoryzacja</DialogTitle>
      <DialogContent>
          <TextField fullWidth value={login} onChange={handleChange(setLogin)} label="login" />
          <TextField fullWidth type="password" value={pass} onChange={handleChange(setPass)} label="hasło" />
          <Box pt={2}><Button onClick={handleSend} fullWidth variant="outlined" color="primary">Zaloguj</Button></Box>
      </DialogContent>
  </Dialog>
  )
}

const getItemFromForm = form =>{
  var fields = Array.from(form.elements).filter(input=>input.type==='text');
  var ret = [];
  for(let i=0;i<fields.length;i+=2){
    if(fields[i].value)
     ret.push({ key: fields[i].value, value: fields[i+1].value });
  }
  return ret;
}

const Item = props => {
  const [item, setItem] = React.useState([]);
  const [isEditing, setEditMode] = React.useState(false);
  const formRef = React.useRef(null);
  const { enqueueSnackbar } = useSnackbar();

  const handleToggleEditMode = ()=>setEditMode(!isEditing);
  const handleAddField = ()=>
    setItem([...getItemFromForm(formRef.current), { key: "", value: "" }])
  
  const handleSave = e =>{
    e.preventDefault();
    const fields = getItemFromForm(formRef.current);
    if(Array.from(new Set(fields.map(field=>field.key))).length !== fields.length){
      return enqueueSnackbar("Klucze nie mogą się powtarzać", { variant: 'error' })
    }
    fetch(props.selected, {
      method: 'PUT',
      body: fields
    })
    .then(()=>{
      setItem(fields);
      handleToggleEditMode();
    })
    .catch(err=>{
      console.error(err);
      return enqueueSnackbar("wystąpił błąd podczas zapisywania", { variant: 'error' })
    })
  }
  React.useEffect(()=>{
    if(props.selected)
      fetch(props.selected)
        .then(setItem)
        .then(()=>{ if(isEditing) handleToggleEditMode(); })
        .catch(console.error);
  },[props.selected])

  return props.selected?(
    <Box mt={2}>
      <Card>
        <CardHeader title={props.selected} />
        <CardContent>
          {isEditing&&<Typography>Aby usunąć pole, wystarczy wyczyścić kontrolkę z kluczem</Typography>}
          <Grid container>
            {!isEditing?
            (item.map(field=>(
              <React.Fragment key={field.key}>
                <Grid item xs={12} md={3}>{field.key}</Grid>
                <Grid item xs={12} md={9}>{field.value}</Grid>
              </React.Fragment>
            )))
            :(
              <form onSubmit={handleSave} ref={formRef}>
                <Grid container>
                  {item.map((field, index)=>(
                    <React.Fragment key={Math.random()}>
                      <Grid item xs={12} md={3}>
                        <TextField label="klucz" fullWidth defaultValue={field.key} />
                      </Grid>
                      <Grid item xs={12} md={9}>
                        <TextField label="wartość" fullWidth defaultValue={field.value} />
                      </Grid>
                    </React.Fragment>
                  ))}
                </Grid>
                <Box py={2}>
                  <Button onClick={handleAddField} variant="outlined" color="secondary">
                    Dodaj Pole
                  </Button>
                  <Button type="submit" variant="outlined" color="primary">
                    Zapisz
                  </Button>
                  <Button onClick={props.onDelete} variant="outlined" color="secondary">Usuń dokument</Button>
                </Box>

              </form>
            )}
          </Grid>
          {!isEditing&&(
            <Button onClick={handleToggleEditMode} variant="contained" color="primary">
              Edytuj
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  ):null;
}



export default function App() {
  const [keys, setKeys] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [isLogged, setLogged] = React.useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const handleError  = (err="wystąpił błąd") => () =>enqueueSnackbar(err, { variant: "error" });
  const handleLogin = ()=>setLogged(true);
  const handleKeysRefresh = () => 
          fetch('/keys')
            .then((newKeys)=>{ if(!keys.length) setSelected(newKeys[0]); setKeys(newKeys); setLogged(true); console.log(newKeys);  return newKeys })
            .catch(err=>{ if(err.status===401) setLogged(false); return err; });

  const handleSubmit = e=>{
    e.preventDefault();
    fetch(e.target[0].value, {
      method: "POST",
      body: []
    })
    .then(()=>{
      handleKeysRefresh();
      e.target[0].value = '';
    })
    .catch(err=>{
      console.error(err);
      return enqueueSnackbar(`wystąpił błąd podczas dodawania: ${err}`, { variant: 'error' })
    })
  }

  const handleDelete = ()=>fetch(selected, {
      method: 'DELETE'
    })
    .then(()=>{
      setKeys(keys.filter(key=>key!==selected));
      setSelected(null);
    })
    .catch(err=>{
      console.error(err);
      return enqueueSnackbar("wystąpił błąd podczas usuwania", { variant: 'error' })
    })

  React.useEffect(()=>{
    handleKeysRefresh();
  }, [isLogged])
  const handleSelect = k => () => setSelected(k);
  return (
    <Container maxWidth="lg">
      <Grid container>
        <Grid item xs={12} md={3}>
          <List>
          {keys.map(k=>(
            <ListItem key={k} button onClick={handleSelect(k)}>
              <ListItemText primary={k} />
            </ListItem>
          ))}
          <ListItem>
            <form onSubmit={handleSubmit}>
              <Box mb={2}>
                <TextField defaultValue="" label="nazwa dokumentu" />
              </Box>
              <Button type="submit" fullWidth variant="contained" color="primary">Dodaj Dokument</Button>
            </form>
          </ListItem>
        </List>
        </Grid>
        <Grid item xs={12} md={9}>
            <Item onDelete={handleDelete} selected={selected} />
        </Grid>
      </Grid>
      {!isLogged&&<LoginForm onError={handleError("Logowanie nie powiodło się")} onSuccess={handleLogin} />}
    </Container>
  );
}
