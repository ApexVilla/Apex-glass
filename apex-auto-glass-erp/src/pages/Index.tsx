import { Navigate } from 'react-router-dom';

const Index = () => {
  // Sempre redirecionar para a página de autenticação
  // A página Auth é responsável por verificar se há usuário logado
  // e redirecionar para o dashboard se necessário
  return <Navigate to="/auth" replace />;
};

export default Index;
