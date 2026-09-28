import { Component, useEffect, useState, type ReactNode } from 'react';
import { DataProvider, useData } from './DataContext';
import { UIProvider } from './UIContext';
import { Layout } from './Layout';
import { LockScreen } from './LockScreen';
import { match, useRoute } from './router';
import { hasPin } from '../services/pinService';
import Home from '../pages/Home';
import Radar from '../pages/Radar';
import Contacts from '../pages/Contacts';
import ContactForm from '../pages/ContactForm';
import ContactProfile from '../pages/ContactProfile';
import Conversations from '../pages/Conversations';
import Objections from '../pages/Objections';
import Simulator from '../pages/Simulator';
import Organization from '../pages/Organization';
import Training from '../pages/Training';
import More from '../pages/More';
import Settings from '../pages/Settings';
import { Empty } from '../components/ui';

function Routes() {
  const { path, query } = useRoute();
  const { contactById } = useData();
  let title = 'NETWORKER OS';
  let page: ReactNode;
  let p: Record<string, string> | null;

  if (path === '/') { title = 'Inicio'; page = <Home />; }
  else if (path === '/radar') { title = 'Radar'; page = <Radar />; }
  else if (path === '/contactos') { title = 'Contactos'; page = <Contacts key={query.toString()} query={query} />; }
  else if (path === '/contactos/nuevo') { title = 'Nuevo contacto'; page = <ContactForm />; }
  else if ((p = match('/contactos/:id/editar', path))) { title = 'Editar contacto'; page = <ContactForm key={p.id} id={p.id} />; }
  else if ((p = match('/contactos/:id', path))) { const c = contactById.get(p.id); title = c ? `${c.firstName} ${c.lastName}` : 'Contacto'; page = <ContactProfile key={p.id} id={p.id} />; }
  else if (path === '/conversaciones') { title = 'Conversaciones'; page = <Conversations key={query.toString()} query={query} />; }
  else if (path === '/objeciones') { title = 'Objeciones'; page = <Objections key={query.toString()} query={query} />; }
  else if (path === '/simulador') { title = 'Simulador'; page = <Simulator />; }
  else if (path === '/organizacion') { title = 'Mi organización'; page = <Organization />; }
  else if (path === '/entrenamiento') { title = 'Entrenamiento'; page = <Training />; }
  else if (path === '/mas') { title = 'Más'; page = <More />; }
  else if (path === '/configuracion') { title = 'Configuración'; page = <Settings />; }
  else page = <Empty title="Página no encontrada" action={<a className="btn" href="#/">Ir al inicio</a>} />;

  useEffect(() => {
    document.title = title === 'Inicio' ? 'NETWORKER OS' : `${title} · NETWORKER OS`;
  }, [title]);

  return (
    <Layout path={path} title={title}>
      <ErrorBoundary key={path}>{page}</ErrorBoundary>
    </Layout>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('Error en la pantalla:', error);
  }
  render() {
    if (this.state.error)
      return (
        <Empty icon="alert" title="Algo salió mal en esta pantalla" action={<button className="btn" onClick={() => (window.location.hash = '#/')}>Volver al inicio</button>}>
          Tus datos están a salvo. Intenta recargar la página.
        </Empty>
      );
    return this.props.children;
  }
}

export default function App() {
  const [locked, setLocked] = useState<boolean | null>(null);
  useEffect(() => {
    hasPin().then(setLocked).catch(() => setLocked(false));
  }, []);
  if (locked === null) return null;
  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;
  return (
    <DataProvider>
      <UIProvider>
        <Routes />
      </UIProvider>
    </DataProvider>
  );
}
