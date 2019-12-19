import React, { useContext } from "react";
import "react-bulma-components/dist/react-bulma-components.min.css";
import "./App.scss";
import { Navbar, Container, Loader, Columns, Section } from "react-bulma-components"
import { StoreProvider, StoreContext } from "./state/store";
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import { LoginForm } from "./pages/login";
import { Tweets } from "./pages/tweets"

const Routing = () => {
  const [globalState] = useContext(StoreContext)

  return (
    globalState.loading > 0 ?
      <Section>
        <Columns className="is-desktop">
          <Loader style={{ height: 100, width: 100 }} />
        </Columns>
      </Section>
      :
      <div>
        <Router>
          <Switch>
            <Route path="/login">
              <LoginForm />
            </Route>
            <Route path="/tweets">
              <Tweets />
            </Route>
            <Route>
              <LoginForm />
            </Route>
          </Switch>
        </Router>
      </div>
  )
}

const NavBar = () => {
  const [globalState] = useContext(StoreContext)

  return (
    <Navbar transparent={false}>
      <Navbar.Brand>
        <img src={require("./logo.svg")} alt="Tupelo" />
      </Navbar.Brand>
      <Navbar.Container position="end">
        {globalState && globalState.user && <p>Decentratweets for {globalState.user.userName}</p>}
      </Navbar.Container>
    </Navbar>
  )
}

const App: React.FC = () => {
  return (
    <StoreProvider >
      <Container>
        <NavBar />
      </Container>
      <Container>
        <Section>
          <Routing />
        </Section>
      </Container>
    </StoreProvider>
  );
}

export default App;
